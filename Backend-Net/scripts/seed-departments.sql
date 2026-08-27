/* =============================================================================
   WMS — seed script for the six baseline organizational departments
   =============================================================================

   Backend-Net/docs/org-structure-contract.fa.md proposes these IDs so the
   frontend's hardcoded department fallback (shared/domain/enums/department.js)
   agrees with the server from day one, with no id-remapping needed.

   PREREQUISITE: run migrations first, or this script will fail on a missing
   table:
       dotnet ef database update --project Infrastructure --startup-project WMS

   Idempotent: safe to re-run, skips any id that already exists.
   -----------------------------------------------------------------------------
*/

SET IDENTITY_INSERT Departments ON;

INSERT INTO Departments (Id, Name, IsActive, HeadId, DeputyId)
SELECT v.Id, v.Name, 1, NULL, NULL
FROM (VALUES
    (1, N'ادمین کل'),
    (2, N'واحد تامین'),
    (3, N'واحد فروش'),
    (4, N'واحد انبارداری'),
    (5, N'واحد حسابداری'),
    (6, N'واحد فناوری')
) AS v(Id, Name)
WHERE NOT EXISTS (SELECT 1 FROM Departments d WHERE d.Id = v.Id);

SET IDENTITY_INSERT Departments OFF;
