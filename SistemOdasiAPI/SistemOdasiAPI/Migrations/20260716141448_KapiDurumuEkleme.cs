using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SistemOdasiAPI.Migrations
{
    /// <inheritdoc />
    public partial class KapiDurumuEkleme : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "KapiAcikMi",
                table: "OrtamVerileri",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "KapiAcikMi",
                table: "OrtamVerileri");
        }
    }
}
