using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LMS.Migrations
{
    /// <inheritdoc />
    public partial class UpdateRoadMapStructure : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "TeacherId",
                table: "RoadMapModels",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");
            migrationBuilder.Sql("UPDATE [RoadMapModels] SET [TeacherId] = NULL WHERE [TeacherId] = 0;");
            migrationBuilder.CreateIndex(
                name: "IX_RoadMapModels_TeacherId",
                table: "RoadMapModels",
                column: "TeacherId");

            migrationBuilder.AddForeignKey(
                name: "FK_RoadMapModels_Users_TeacherId",
                table: "RoadMapModels",
                column: "TeacherId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RoadMapModels_Users_TeacherId",
                table: "RoadMapModels");

            migrationBuilder.DropIndex(
                name: "IX_RoadMapModels_TeacherId",
                table: "RoadMapModels");

            migrationBuilder.AlterColumn<int>(
                name: "TeacherId",
                table: "RoadMapModels",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);
        }
    }
}
