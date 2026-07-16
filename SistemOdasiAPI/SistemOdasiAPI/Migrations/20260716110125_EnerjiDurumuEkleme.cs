using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SistemOdasiAPI.Migrations
{
    /// <inheritdoc />
    public partial class EnerjiDurumuEkleme : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<double>(
                name: "Sicaklik",
                table: "OrtamVerileri",
                type: "float",
                nullable: false,
                oldClrType: typeof(float),
                oldType: "real");

            migrationBuilder.AlterColumn<double>(
                name: "Nem",
                table: "OrtamVerileri",
                type: "float",
                nullable: false,
                oldClrType: typeof(float),
                oldType: "real");

            migrationBuilder.AlterColumn<int>(
                name: "Gaz",
                table: "OrtamVerileri",
                type: "int",
                nullable: false,
                oldClrType: typeof(float),
                oldType: "real");

            migrationBuilder.AddColumn<bool>(
                name: "EnerjiVarMi",
                table: "OrtamVerileri",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EnerjiVarMi",
                table: "OrtamVerileri");

            migrationBuilder.AlterColumn<float>(
                name: "Sicaklik",
                table: "OrtamVerileri",
                type: "real",
                nullable: false,
                oldClrType: typeof(double),
                oldType: "float");

            migrationBuilder.AlterColumn<float>(
                name: "Nem",
                table: "OrtamVerileri",
                type: "real",
                nullable: false,
                oldClrType: typeof(double),
                oldType: "float");

            migrationBuilder.AlterColumn<float>(
                name: "Gaz",
                table: "OrtamVerileri",
                type: "real",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");
        }
    }
}
