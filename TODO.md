# AssignCustomers Logic Fixes

## Completed Tasks
- [x] Update all references to `selectedStaff.uid` to `selectedStaff.id` in AssignCustomers.js for consistency with other files.
- [x] Change `ID: {item.connection}` to `ID: {item.connectionNo}` in the customer row render.
- [x] Ensure the assigned staff finder uses `staff.id` instead of `staff.uid`.

## Followup Steps
- [ ] Test assigning and unassigning customers to verify messages display correctly and assignments update properly.
- [ ] Check the modal and badges for accurate display.
