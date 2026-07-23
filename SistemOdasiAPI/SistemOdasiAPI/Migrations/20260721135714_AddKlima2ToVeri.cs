using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SistemOdasiAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddKlima2ToVeri : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Klima2AcikMi",
                table: "OrtamVerileri",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Klima2AcikMi",
                table: "OrtamVerileri");
        }
    }
}
