## Problem Analysis
The experiment is failing with "Error calculating performance: 'label'" because:
1. Incorrect `data_key` parameter: Using "label" instead of the correct constants (DK_R/DK_I/DK_L)
2. Incorrect `col_set` parameter: Using list ["label"] instead of string "label"
3. Missing proper error handling for different dataset handler types
4. Simplistic performance calculation that doesn't match QLib's expected workflow

## Solution Plan
1. **Fix the dataset.prepare() call** in `train.py`:
   - Use `col_set="label"` (string) instead of `col_set=["label"]` (list)
   - Use `data_key=DataHandlerLP.DK_R` (raw data) for labels
   - Add proper error handling similar to SignalRecord.generate_label

2. **Improve label extraction logic**:
   - Add fallback mechanisms for different dataset handler types
   - Handle cases where drop_raw=True
   - Ensure proper index alignment between predictions and labels

3. **Update performance calculation**:
   - Use QLib's built-in evaluation functions instead of direct multiplication
   - Calculate meaningful metrics like IC, rank IC, and basic return metrics
   - Handle edge cases like empty data

4. **Add necessary imports**:
   - Import DataHandlerLP and its constants
   - Import QLib's evaluation functions

## Files to Modify
- `/home/idea/code/qlib_t/backend/app/tasks/train.py`

## Expected Outcome
- Experiment completes without "Error calculating performance: 'label'"
- Proper performance metrics are calculated and saved
- Better error handling for different dataset configurations
- Alignment with QLib's standard workflow as shown in the notebook