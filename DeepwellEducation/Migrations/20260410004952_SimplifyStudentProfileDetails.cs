using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepwellEducation.Migrations
{
    /// <inheritdoc />
    public partial class SimplifyStudentProfileDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "StudentProfiles",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FirstName",
                table: "StudentProfiles",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LastName",
                table: "StudentProfiles",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.DropColumn(
                name: "CountryOrRegion",
                table: "StudentProfiles");

            migrationBuilder.DropColumn(
                name: "EmergencyContactName",
                table: "StudentProfiles");

            migrationBuilder.DropColumn(
                name: "EmergencyContactPhone",
                table: "StudentProfiles");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CountryOrRegion",
                table: "StudentProfiles",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "EmergencyContactName",
                table: "StudentProfiles",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "EmergencyContactPhone",
                table: "StudentProfiles",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.DropColumn(
                name: "Address",
                table: "StudentProfiles");

            migrationBuilder.DropColumn(
                name: "FirstName",
                table: "StudentProfiles");

            migrationBuilder.DropColumn(
                name: "LastName",
                table: "StudentProfiles");
        }
    }
}
