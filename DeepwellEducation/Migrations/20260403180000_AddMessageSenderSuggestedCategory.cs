using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepwellEducation.Migrations
{
    /// <inheritdoc />
    public partial class AddMessageSenderSuggestedCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SenderSuggestedCategory",
                table: "Messages",
                type: "INTEGER",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SenderSuggestedCategory",
                table: "Messages");
        }
    }
}
