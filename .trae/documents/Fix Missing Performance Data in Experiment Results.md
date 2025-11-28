## Problem Analysis

The issue is that the frontend is showing empty performance metrics and charts because the backend is not providing all the required data. Specifically:

1. **Missing `cumulative_returns` field**: The frontend expects `experiment.performance.cumulative_returns` to generate the performance chart, but this field is not being included in the performance data returned by the backend.

2. **Incomplete performance data**: While the backend calculates various metrics, it's not including all the data that the frontend needs to render the charts and metrics properly.

## Solution Plan

1. **Update the backend performance calculation**: Modify the `train.py` file to include the `cumulative_returns` data in the performance dictionary.

2. **Ensure proper data format**: Make sure the cumulative returns data is in a format that the frontend can easily use (dictionary with dates as keys and return values as values).

3. **Test the fix**: Run an experiment and verify that the performance data is now correctly displayed in the frontend.

## Implementation Steps

1. **Modify `/home/idea/code/qlib_t/backend/app/tasks/train.py`**: Update the performance calculation section to include cumulative returns data.

2. **Add cumulative_returns to performance dictionary**: In the performance dictionary, add a new field `cumulative_returns` that contains the cumulative returns data with dates as keys.

3. **Test the changes**: Run an experiment and check if the performance metrics and chart are now displaying correctly in the frontend.

## Expected Outcome

After implementing this fix, when an experiment completes:
- The performance metrics card will display actual values instead of 0.00%
- The performance chart will show the cumulative returns over time
- Both div elements mentioned in the issue will display the actual experiment data