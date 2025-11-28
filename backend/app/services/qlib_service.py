import qlib
from qlib.data import D
from qlib.config import REG_CN
from typing import List, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class QLibService:
    _initialized = False
    
    @classmethod
    def init_qlib(cls, provider_uri: str = "/home/idea/code/qlib_t/data/cn_data") -> bool:
        """
        Initialize QLib
        
        Args:
            provider_uri: Path to QLib data directory
            
        Returns:
            bool: True if initialization successful, False otherwise
        """
        if cls._initialized:
            logger.info("QLib is already initialized")
            return True
        
        try:
            logger.info(f"Initializing QLib with provider_uri: {provider_uri}")
            qlib.init(provider_uri=provider_uri, region=REG_CN)
            cls._initialized = True
            logger.info("QLib initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize QLib: {e}")
            return False
    
    @classmethod
    def get_instruments(cls, market: str = "all") -> List[str]:
        """
        Get instruments from QLib
        
        Args:
            market: Market name or list of instruments
            
        Returns:
            List[str]: List of instruments
        """
        if not cls._initialized:
            cls.init_qlib()
        
        try:
            instruments = D.instruments(market)
            logger.info(f"Got {len(instruments)} instruments from market: {market}")
            return instruments
        except Exception as e:
            logger.error(f"Failed to get instruments: {e}")
            return []
    
    @classmethod
    def get_stock_data(cls, instrument: str, start_date: str, end_date: str, fields: List[str] = None) -> Dict[str, Any]:
        """
        Get stock data from QLib
        
        Args:
            instrument: Stock code
            start_date: Start date in format YYYY-MM-DD
            end_date: End date in format YYYY-MM-DD
            fields: List of fields to get
            
        Returns:
            Dict[str, Any]: Stock data
        """
        if not cls._initialized:
            cls.init_qlib()
        
        try:
            if fields is None:
                fields = ["open", "high", "low", "close", "volume"]
            
            # Get data from QLib
            data = D.features([instrument], fields, start_date, end_date)
            logger.info(f"Got data for {instrument} from {start_date} to {end_date}")
            return data.to_dict()
        except Exception as e:
            logger.error(f"Failed to get stock data: {e}")
            return {}
    
    @classmethod
    def get_factors(cls, instrument: str, start_date: str, end_date: str, factors: List[str] = None) -> Dict[str, Any]:
        """
        Get factors from QLib
        
        Args:
            instrument: Stock code
            start_date: Start date in format YYYY-MM-DD
            end_date: End date in format YYYY-MM-DD
            factors: List of factors to get
            
        Returns:
            Dict[str, Any]: Factor data
        """
        if not cls._initialized:
            cls.init_qlib()
        
        try:
            if factors is None:
                factors = ["MACD", "RSI", "KDJ"]
            
            # Get factor data from QLib
            data = D.features([instrument], factors, start_date, end_date)
            logger.info(f"Got factors for {instrument} from {start_date} to {end_date}")
            return data.to_dict()
        except Exception as e:
            logger.error(f"Failed to get factors: {e}")
            return {}
    
    @classmethod
    def is_initialized(cls) -> bool:
        """
        Check if QLib is initialized
        
        Returns:
            bool: True if initialized, False otherwise
        """
        return cls._initialized

# Create a singleton instance
qlib_service = QLibService()
