"""
Local QLib training service.
Executes qlib training workflows locally using experiment configurations.
"""

import logging
import os
import sys
import json
import traceback
import tempfile
from datetime import datetime
from typing import Any, Callable, Dict, Optional

import yaml

logger = logging.getLogger(__name__)


class LocalTrainer:
    """Executes qlib training workflows locally."""

    def __init__(self, progress_callback: Optional[Callable[[int, str], None]] = None):
        """
        Args:
            progress_callback: Optional callback(progress_pct, message) for progress updates.
        """
        self.progress_callback = progress_callback
        self._qlib_initialized = False

    def _report(self, progress: int, message: str):
        """Report progress via callback if available."""
        logger.info(f"[Training progress={progress}%] {message}")
        if self.progress_callback:
            try:
                self.progress_callback(progress, message)
            except Exception as e:
                logger.warning(f"Progress callback failed: {e}")

    def _init_qlib(self, provider_uri: Optional[str] = None):
        """Initialize qlib if not already done."""
        if self._qlib_initialized:
            return

        try:
            import qlib
            from qlib.config import REG_CN

            uri = provider_uri or os.getenv("QLIB_PROVIDER_URI", "~/.qlib/qlib_data/cn_data")
            uri = os.path.expanduser(uri)

            if not os.path.exists(uri):
                logger.warning(f"QLib data directory not found: {uri}. Training may fail.")
                os.makedirs(uri, exist_ok=True)

            qlib.init(provider_uri=uri, region=REG_CN)
            self._qlib_initialized = True
            logger.info(f"QLib initialized with provider_uri={uri}")
        except Exception as e:
            logger.error(f"Failed to initialize QLib: {e}")
            raise RuntimeError(f"QLib initialization failed: {e}") from e

    def run_training(self, experiment_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run a qlib training workflow from experiment configuration.

        Args:
            experiment_config: The experiment configuration dict. This should be
                a qlib workflow config (with 'qlib_init', 'task', 'model', 'dataset', etc.)
                or a simplified config with 'model', 'dataset', 'market', 'train_period', 'valid_period', 'test_period'.

        Returns:
            Dict with training results including performance metrics.
        """
        self._report(0, "Starting training...")

        results = {
            "status": "completed",
            "started_at": datetime.now().isoformat(),
        }

        try:
            # Determine config format and run appropriate workflow
            if self._is_qlib_workflow_config(experiment_config):
                results.update(self._run_qlib_workflow(experiment_config))
            else:
                results.update(self._run_simplified_workflow(experiment_config))

            results["completed_at"] = datetime.now().isoformat()
            self._report(100, "Training completed successfully")

        except Exception as e:
            tb = traceback.format_exc()
            logger.error(f"Training failed: {e}\n{tb}")
            results["status"] = "failed"
            results["error"] = str(e)
            results["traceback"] = tb
            results["completed_at"] = datetime.now().isoformat()
            self._report(100, f"Training failed: {e}")

        return results

    def _is_qlib_workflow_config(self, config: Dict[str, Any]) -> bool:
        """Check if the config is a full qlib workflow config."""
        # Full qlib workflow configs typically have 'task' or 'qlib_init' keys
        return "task" in config or "qlib_init" in config

    def _run_qlib_workflow(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Run a full qlib workflow from YAML-style config."""
        self._report(5, "Parsing qlib workflow configuration...")

        # Initialize qlib with config settings
        qlib_init = config.get("qlib_init", {})
        provider_uri = qlib_init.get("provider_uri", None)
        self._init_qlib(provider_uri)

        self._report(10, "QLib initialized, preparing workflow...")

        try:
            from qlib.workflow import R
            from qlib.workflow.record_temp import SignalRecord, SigAnaRecord, PortAnaRecord
            from qlib.utils import init_instance_by_config
        except ImportError as e:
            raise RuntimeError(f"Failed to import qlib workflow modules: {e}") from e

        task_config = config.get("task", config)

        # Build model
        self._report(15, "Building model...")
        model_config = task_config.get("model", {})
        model = init_instance_by_config(model_config) if model_config else None

        # Build dataset
        self._report(20, "Building dataset...")
        dataset_config = task_config.get("dataset", {})
        dataset = init_instance_by_config(dataset_config) if dataset_config else None

        if model is None or dataset is None:
            raise ValueError("Both 'model' and 'dataset' must be specified in the task config")

        # Train the model
        self._report(30, "Training model...")
        model.fit(dataset)
        self._report(70, "Model training completed, generating predictions...")

        # Create recorder and generate records
        record_config = task_config.get("record", [])
        performance = {}

        with R.start(experiment_name=config.get("experiment_name", "qlib_web_experiment")):
            R.log_params(**{
                "model": model_config.get("class", "unknown"),
                "dataset": dataset_config.get("class", "unknown"),
            })

            self._report(75, "Generating signal records...")
            # Generate signal record
            sr = SignalRecord(model=model, dataset=dataset)
            sr.generate()

            self._report(85, "Generating signal analysis...")
            try:
                sar = SigAnaRecord(sr)
                sar.generate()
            except Exception as e:
                logger.warning(f"Signal analysis failed (non-fatal): {e}")

            self._report(90, "Generating portfolio analysis...")
            try:
                par = PortAnaRecord(sr, config.get("backtest", {}), config.get("port_analysis_config", {}))
                par.generate()
            except Exception as e:
                logger.warning(f"Portfolio analysis failed (non-fatal): {e}")

            self._report(95, "Collecting results...")
            # Collect results from recorder
            recorder = R.get_recorder()
            try:
                metrics = recorder.list_metrics()
                performance.update(metrics)
            except Exception as e:
                logger.warning(f"Failed to collect metrics: {e}")

        return {
            "performance": performance,
            "model_class": model_config.get("class", "unknown"),
        }

    def _run_simplified_workflow(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run training from a simplified config format.
        This supports the frontend's experiment creation form.

        Expected config keys:
            - model: str (e.g., "LGBModel", "LinearModel")
            - dataset: str or dict
            - market: str (e.g., "csi300")
            - train_period: [start, end]
            - valid_period: [start, end]
            - test_period: [start, end]
            - features: list or str (feature group name like "Alpha158")
        """
        self._report(5, "Parsing simplified configuration...")

        model_name = config.get("model", "LGBModel")
        market = config.get("market", "csi300")
        features = config.get("features", "Alpha158")
        benchmark = config.get("benchmark", "SH000300")

        # Parse periods
        train_period = config.get("train_period", ["2008-01-01", "2014-12-31"])
        valid_period = config.get("valid_period", ["2015-01-01", "2016-12-31"])
        test_period = config.get("test_period", ["2017-01-01", "2020-08-01"])

        if isinstance(train_period, dict):
            train_period = [train_period.get("start", "2008-01-01"), train_period.get("end", "2014-12-31")]
        if isinstance(valid_period, dict):
            valid_period = [valid_period.get("start", "2015-01-01"), valid_period.get("end", "2016-12-31")]
        if isinstance(test_period, dict):
            test_period = [test_period.get("start", "2017-01-01"), test_period.get("end", "2020-08-01")]

        # Convert to full qlib workflow config
        self._report(10, f"Building workflow for model={model_name}, market={market}...")

        qlib_config = self._build_qlib_config(
            model_name=model_name,
            market=market,
            features=features,
            benchmark=benchmark,
            train_period=train_period,
            valid_period=valid_period,
            test_period=test_period,
            extra_config=config,
        )

        return self._run_qlib_workflow(qlib_config)

    def _build_qlib_config(
        self,
        model_name: str,
        market: str,
        features: str,
        benchmark: str,
        train_period: list,
        valid_period: list,
        test_period: list,
        extra_config: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Build a full qlib workflow config from simplified parameters."""

        # Map model names to qlib class paths
        model_map = {
            "LGBModel": {
                "class": "LGBModel",
                "module_path": "qlib.contrib.model.gbdt",
                "kwargs": {"loss": "mse", "colsample_bytree": 0.8879, "learning_rate": 0.0421,
                           "subsample": 0.8789, "lambda_l1": 205.6999, "lambda_l2": 580.9768,
                           "max_depth": 8, "num_leaves": 210, "num_threads": 20},
            },
            "LinearModel": {
                "class": "LinearModel",
                "module_path": "qlib.contrib.model.linear",
                "kwargs": {},
            },
            "XGBModel": {
                "class": "XGBModel",
                "module_path": "qlib.contrib.model.xgboost",
                "kwargs": {},
            },
            "CatBoostModel": {
                "class": "CatBoostModel",
                "module_path": "qlib.contrib.model.catboost_model",
                "kwargs": {},
            },
        }

        model_config = model_map.get(model_name, {
            "class": model_name,
            "module_path": "qlib.contrib.model.gbdt",
            "kwargs": {},
        })

        # Allow overriding model kwargs from config
        if extra_config and "model_kwargs" in extra_config:
            model_config["kwargs"].update(extra_config["model_kwargs"])

        # Feature handler config
        handler_map = {
            "Alpha158": {
                "class": "Alpha158",
                "module_path": "qlib.contrib.data.handler",
                "kwargs": {
                    "start_time": train_period[0],
                    "end_time": test_period[1],
                    "fit_start_time": train_period[0],
                    "fit_end_time": train_period[1],
                    "instruments": market,
                },
            },
            "Alpha360": {
                "class": "Alpha360",
                "module_path": "qlib.contrib.data.handler",
                "kwargs": {
                    "start_time": train_period[0],
                    "end_time": test_period[1],
                    "fit_start_time": train_period[0],
                    "fit_end_time": train_period[1],
                    "instruments": market,
                },
            },
        }

        handler_config = handler_map.get(features, handler_map["Alpha158"])

        return {
            "experiment_name": extra_config.get("name", "web_experiment") if extra_config else "web_experiment",
            "task": {
                "model": model_config,
                "dataset": {
                    "class": "DatasetH",
                    "module_path": "qlib.data.dataset",
                    "kwargs": {
                        "handler": handler_config,
                        "segments": {
                            "train": train_period,
                            "valid": valid_period,
                            "test": test_period,
                        },
                    },
                },
                "record": [
                    {"class": "SignalRecord", "module_path": "qlib.workflow.record_temp"},
                    {"class": "SigAnaRecord", "module_path": "qlib.workflow.record_temp"},
                ],
            },
            "backtest": {
                "start_time": test_period[0],
                "end_time": test_period[1],
                "account": extra_config.get("account", 100000000) if extra_config else 100000000,
                "benchmark": benchmark,
                "exchange_kwargs": {
                    "limit_threshold": 0.095,
                    "deal_price": "close",
                    "open_cost": 0.0005,
                    "close_cost": 0.0015,
                    "min_cost": 5,
                },
            },
        }
