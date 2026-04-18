using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepwellEducation.Migrations
{
    /// <inheritdoc />
    public partial class AddMessageAiAssistFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AiExtractedJson",
                table: "Messages",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AiSuggestedPriority",
                table: "Messages",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AiSuggestedReplyDraft",
                table: "Messages",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AiSummary",
                table: "Messages",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AiExtractedJson",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "AiSuggestedPriority",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "AiSuggestedReplyDraft",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "AiSummary",
                table: "Messages");
        }
    }
}
