namespace LanguageSchoolManagement.Data;

/// <summary>
/// Auto-increment table: insert one row to get next Id, then map to StudentNumber (e.g. S202500001).
/// </summary>
public class StudentNumberSequence
{
    public long Id { get; set; }
}
