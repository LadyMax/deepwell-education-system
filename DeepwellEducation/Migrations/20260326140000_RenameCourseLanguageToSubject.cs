using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepwellEducation.Migrations
{
    /// <inheritdoc />
    public partial class RenameCourseLanguageToSubject : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "LanguageCode",
                table: "Courses",
                newName: "SubjectCode");

            migrationBuilder.RenameColumn(
                name: "LanguageName",
                table: "Courses",
                newName: "SubjectName");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "SubjectCode",
                table: "Courses",
                newName: "LanguageCode");

            migrationBuilder.RenameColumn(
                name: "SubjectName",
                table: "Courses",
                newName: "LanguageName");
        }
    }
}
