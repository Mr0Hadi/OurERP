namespace Domain.Enums
{
    /// <summary>
    /// Whose documents GetScopePerformance counts. The team/department is never a parameter - it is always the signed-in
    /// user's own, so nobody can read another team's numbers by changing an id. Numbers are a frontend contract.
    /// </summary>
    public enum ReportScopeEnum
    {
        ME = 0,
        TEAM = 1,
        DEPARTMENT = 2,
    }
}
