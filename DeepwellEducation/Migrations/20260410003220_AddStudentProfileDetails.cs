using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepwellEducation.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentProfileDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CountryOrRegion",
                table: "StudentProfiles",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "DateOfBirth",
                table: "StudentProfiles",
                type: "TEXT",
                nullable: true);

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

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "StudentProfiles",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "StudentProfiles",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CountryOrRegion",
                table: "StudentProfiles");

            migrationBuilder.DropColumn(
                name: "DateOfBirth",
                table: "StudentProfiles");

            migrationBuilder.DropColumn(
                name: "EmergencyContactName",
                table: "StudentProfiles");

            migrationBuilder.DropColumn(
                name: "EmergencyContactPhone",
                table: "StudentProfiles");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "StudentProfiles");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "StudentProfiles");
        }
    }
}
