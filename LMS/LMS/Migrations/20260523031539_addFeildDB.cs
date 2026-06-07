using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LMS.Migrations
{
    /// <inheritdoc />
    public partial class addFeildDB : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DeletedByRole",
                table: "Lessons",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LockedByRole",
                table: "Lessons",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedByRole",
                table: "Courses",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedByRole",
                table: "Chapters",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LockedByRole",
                table: "Chapters",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeletedByRole",
                table: "Lessons");

            migrationBuilder.DropColumn(
                name: "LockedByRole",
                table: "Lessons");

            migrationBuilder.DropColumn(
                name: "DeletedByRole",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "DeletedByRole",
                table: "Chapters");

            migrationBuilder.DropColumn(
                name: "LockedByRole",
                table: "Chapters");
        }
    }
}
