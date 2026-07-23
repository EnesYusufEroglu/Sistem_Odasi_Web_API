using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SistemOdasiAPI.Migrations
{
    /// <inheritdoc />
    public partial class KlimaDurumuEkleme : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "KlimaAcikMi",
                table: "OrtamVerileri",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "KlimaAcikMi",
                table: "OrtamVerileri");
        }
    }
}
