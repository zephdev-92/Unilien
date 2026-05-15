-- Allow employees to delete their own pending absences
CREATE POLICY "Employees can delete own pending absences"
ON absences
FOR DELETE
TO authenticated
USING (
  employee_id = auth.uid()
  AND status = 'pending'
);
