using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepwellEducation.Migrations
{
    /// <inheritdoc />
    public partial class RenameCourseSubjectToLanguageFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "SubjectName",
                table: "Courses",
                newName: "LanguageName");

            migrationBuilder.RenameColumn(
                name: "SubjectCode",
                table: "Courses",
                newName: "LanguageCode");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "LanguageName",
                table: "Courses",
                newName: "SubjectName");

            migrationBuilder.RenameColumn(
                name: "LanguageCode",
                table: "Courses",
                newName: "SubjectCode");
        }
    }
}
