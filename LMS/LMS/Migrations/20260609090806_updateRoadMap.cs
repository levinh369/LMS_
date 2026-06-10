using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LMS.Migrations
{
    /// <inheritdoc />
    public partial class updateRoadMap : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RoadMapModels_Users_TeacherId",
                table: "RoadMapModels");

            migrationBuilder.DropColumn(
                name: "LockedByRole",
                table: "RoadMapModels");

            migrationBuilder.RenameColumn(
                name: "TeacherId",
                table: "RoadMapModels",
                newName: "CreatedById");

            migrationBuilder.RenameIndex(
                name: "IX_RoadMapModels_TeacherId",
                table: "RoadMapModels",
                newName: "IX_RoadMapModels_CreatedById");

            migrationBuilder.AddForeignKey(
                name: "FK_RoadMapModels_Users_CreatedById",
                table: "RoadMapModels",
                column: "CreatedById",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RoadMapModels_Users_CreatedById",
                table: "RoadMapModels");

            migrationBuilder.RenameColumn(
                name: "CreatedById",
                table: "RoadMapModels",
                newName: "TeacherId");

            migrationBuilder.RenameIndex(
                name: "IX_RoadMapModels_CreatedById",
                table: "RoadMapModels",
                newName: "IX_RoadMapModels_TeacherId");

            migrationBuilder.AddColumn<string>(
                name: "LockedByRole",
                table: "RoadMapModels",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_RoadMapModels_Users_TeacherId",
                table: "RoadMapModels",
                column: "TeacherId",
                principalTable: "Users",
                principalColumn: "Id");
        }
    }
}
