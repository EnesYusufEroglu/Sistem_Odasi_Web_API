using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SistemOdasiAPI.Migrations
{
    /// <inheritdoc />
    public partial class KapiYerineHareketSensoru : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "KapiAcikMi",
                table: "OrtamVerileri",
                newName: "HareketVarMi");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "HareketVarMi",
                table: "OrtamVerileri",
                newName: "KapiAcikMi");
        }
    }
}
