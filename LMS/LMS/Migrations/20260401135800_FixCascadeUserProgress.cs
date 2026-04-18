using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LMS.Migrations
{
    /// <inheritdoc />
    public partial class FixCascadeUserProgress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CourseId",
                table: "UsersProgress",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_UsersProgress_CourseId",
                table: "UsersProgress",
                column: "CourseId");

            migrationBuilder.AddForeignKey(
                name: "FK_UsersProgress_Courses_CourseId",
                table: "UsersProgress",
                column: "CourseId",
                principalTable: "Courses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UsersProgress_Courses_CourseId",
                table: "UsersProgress");

            migrationBuilder.DropIndex(
                name: "IX_UsersProgress_CourseId",
                table: "UsersProgress");

            migrationBuilder.DropColumn(
                name: "CourseId",
                table: "UsersProgress");
        }
    }
}
