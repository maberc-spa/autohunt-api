import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

const countries = [
  { name: "Chile", code: "CHL" },
  { name: "Argentina", code: "ARG" },
  { name: "Brasil", code: "BRA" },
  { name: "México", code: "MEX" },
  { name: "Estados Unidos", code: "USA" },
  { name: "Alemania", code: "DEU" },
  { name: "Japón", code: "JPN" },
  { name: "Corea del Sur", code: "KOR" },
  { name: "Francia", code: "FRA" },
  { name: "Italia", code: "ITA" },
  { name: "España", code: "ESP" },
  { name: "China", code: "CHN" },
];

const brands = [
  { name: "Toyota", countryCode: "JPN" },
  { name: "Honda", countryCode: "JPN" },
  { name: "Nissan", countryCode: "JPN" },
  { name: "Mazda", countryCode: "JPN" },
  { name: "Subaru", countryCode: "JPN" },
  { name: "Mitsubishi", countryCode: "JPN" },
  { name: "Suzuki", countryCode: "JPN" },
  { name: "Volkswagen", countryCode: "DEU" },
  { name: "BMW", countryCode: "DEU" },
  { name: "Mercedes-Benz", countryCode: "DEU" },
  { name: "Audi", countryCode: "DEU" },
  { name: "Porsche", countryCode: "DEU" },
  { name: "Ford", countryCode: "USA" },
  { name: "Chevrolet", countryCode: "USA" },
  { name: "Tesla", countryCode: "USA" },
  { name: "Jeep", countryCode: "USA" },
  { name: "Hyundai", countryCode: "KOR" },
  { name: "Kia", countryCode: "KOR" },
  { name: "Peugeot", countryCode: "FRA" },
  { name: "Renault", countryCode: "FRA" },
  { name: "Citroën", countryCode: "FRA" },
  { name: "Fiat", countryCode: "ITA" },
  { name: "Alfa Romeo", countryCode: "ITA" },
  { name: "SEAT", countryCode: "ESP" },
  { name: "BYD", countryCode: "CHN" },
  { name: "Chery", countryCode: "CHN" },
  { name: "Great Wall", countryCode: "CHN" },
];

const models = [
  { brandName: "Toyota", countryCode: "JPN", name: "Corolla" },
  { brandName: "Toyota", countryCode: "JPN", name: "Hilux" },
  { brandName: "Toyota", countryCode: "JPN", name: "RAV4" },
  { brandName: "Toyota", countryCode: "JPN", name: "Yaris" },
  { brandName: "Toyota", countryCode: "JPN", name: "Camry" },
  { brandName: "Honda", countryCode: "JPN", name: "Civic" },
  { brandName: "Honda", countryCode: "JPN", name: "CR-V" },
  { brandName: "Honda", countryCode: "JPN", name: "HR-V" },
  { brandName: "Honda", countryCode: "JPN", name: "Fit" },
  { brandName: "Nissan", countryCode: "JPN", name: "Sentra" },
  { brandName: "Nissan", countryCode: "JPN", name: "Versa" },
  { brandName: "Nissan", countryCode: "JPN", name: "Kicks" },
  { brandName: "Nissan", countryCode: "JPN", name: "Frontier" },
  { brandName: "Mazda", countryCode: "JPN", name: "Mazda3" },
  { brandName: "Mazda", countryCode: "JPN", name: "CX-5" },
  { brandName: "Mazda", countryCode: "JPN", name: "CX-30" },
  { brandName: "Subaru", countryCode: "JPN", name: "Forester" },
  { brandName: "Subaru", countryCode: "JPN", name: "Outback" },
  { brandName: "Mitsubishi", countryCode: "JPN", name: "L200" },
  { brandName: "Mitsubishi", countryCode: "JPN", name: "Outlander" },
  { brandName: "Suzuki", countryCode: "JPN", name: "Swift" },
  { brandName: "Suzuki", countryCode: "JPN", name: "Jimny" },
  { brandName: "Volkswagen", countryCode: "DEU", name: "Gol" },
  { brandName: "Volkswagen", countryCode: "DEU", name: "Jetta" },
  { brandName: "Volkswagen", countryCode: "DEU", name: "Tiguan" },
  { brandName: "Volkswagen", countryCode: "DEU", name: "Amarok" },
  { brandName: "BMW", countryCode: "DEU", name: "Serie 3" },
  { brandName: "BMW", countryCode: "DEU", name: "X1" },
  { brandName: "BMW", countryCode: "DEU", name: "X3" },
  { brandName: "Mercedes-Benz", countryCode: "DEU", name: "Clase C" },
  { brandName: "Mercedes-Benz", countryCode: "DEU", name: "GLA" },
  { brandName: "Mercedes-Benz", countryCode: "DEU", name: "Sprinter" },
  { brandName: "Audi", countryCode: "DEU", name: "A3" },
  { brandName: "Audi", countryCode: "DEU", name: "A4" },
  { brandName: "Audi", countryCode: "DEU", name: "Q5" },
  { brandName: "Porsche", countryCode: "DEU", name: "Cayenne" },
  { brandName: "Porsche", countryCode: "DEU", name: "Macan" },
  { brandName: "Ford", countryCode: "USA", name: "Ranger" },
  { brandName: "Ford", countryCode: "USA", name: "Escape" },
  { brandName: "Ford", countryCode: "USA", name: "F-150" },
  { brandName: "Ford", countryCode: "USA", name: "Bronco" },
  { brandName: "Chevrolet", countryCode: "USA", name: "Onix" },
  { brandName: "Chevrolet", countryCode: "USA", name: "Tracker" },
  { brandName: "Chevrolet", countryCode: "USA", name: "Silverado" },
  { brandName: "Chevrolet", countryCode: "USA", name: "Spark" },
  { brandName: "Tesla", countryCode: "USA", name: "Model 3" },
  { brandName: "Tesla", countryCode: "USA", name: "Model Y" },
  { brandName: "Jeep", countryCode: "USA", name: "Wrangler" },
  { brandName: "Jeep", countryCode: "USA", name: "Compass" },
  { brandName: "Hyundai", countryCode: "KOR", name: "Tucson" },
  { brandName: "Hyundai", countryCode: "KOR", name: "Accent" },
  { brandName: "Hyundai", countryCode: "KOR", name: "Elantra" },
  { brandName: "Hyundai", countryCode: "KOR", name: "Santa Fe" },
  { brandName: "Kia", countryCode: "KOR", name: "Sportage" },
  { brandName: "Kia", countryCode: "KOR", name: "Rio" },
  { brandName: "Kia", countryCode: "KOR", name: "Seltos" },
  { brandName: "Peugeot", countryCode: "FRA", name: "208" },
  { brandName: "Peugeot", countryCode: "FRA", name: "3008" },
  { brandName: "Peugeot", countryCode: "FRA", name: "Partner" },
  { brandName: "Renault", countryCode: "FRA", name: "Duster" },
  { brandName: "Renault", countryCode: "FRA", name: "Koleos" },
  { brandName: "Renault", countryCode: "FRA", name: "Kangoo" },
  { brandName: "Citroën", countryCode: "FRA", name: "C3" },
  { brandName: "Citroën", countryCode: "FRA", name: "C4" },
  { brandName: "Citroën", countryCode: "FRA", name: "Berlingo" },
  { brandName: "Fiat", countryCode: "ITA", name: "500" },
  { brandName: "Fiat", countryCode: "ITA", name: "Argo" },
  { brandName: "Fiat", countryCode: "ITA", name: "Cronos" },
  { brandName: "Alfa Romeo", countryCode: "ITA", name: "Giulia" },
  { brandName: "Alfa Romeo", countryCode: "ITA", name: "Stelvio" },
  { brandName: "SEAT", countryCode: "ESP", name: "Ibiza" },
  { brandName: "SEAT", countryCode: "ESP", name: "Arona" },
  { brandName: "BYD", countryCode: "CHN", name: "Dolphin" },
  { brandName: "BYD", countryCode: "CHN", name: "Seal" },
  { brandName: "Chery", countryCode: "CHN", name: "Tiggo 4" },
  { brandName: "Chery", countryCode: "CHN", name: "Tiggo 7" },
  { brandName: "Great Wall", countryCode: "CHN", name: "Poer" },
  { brandName: "Great Wall", countryCode: "CHN", name: "Haval H6" },
];

const vehicleTypes = [
  {
    name: "Sedán",
    description: "Automóvil cerrado con maletero separado y techo fijo",
  },
  {
    name: "SUV",
    description:
      "Vehículo utilitario deportivo; carrocería alta con tracción opcional en las cuatro ruedas",
  },
  {
    name: "Camioneta",
    description:
      "Vehículo liviano con cabina y caja de carga abierta en la parte trasera",
  },
  {
    name: "Hatchback",
    description:
      "Auto compacto con puerta trasera abatible hacia arriba que integra el maletero con el habitáculo",
  },
  {
    name: "Coupe",
    description:
      "Auto de dos puertas con techo fijo, generalmente más deportivo y bajo que un sedán",
  },
  {
    name: "Convertible",
    description: "Auto con techo retráctil o desmontable",
  },
  {
    name: "Minivan",
    description:
      "Furgoneta de techo alto diseñada para el transporte de pasajeros, con puertas laterales corredizas",
  },
  {
    name: "Furgón",
    description:
      "Vehículo de caja rectangular usado para transporte de carga o personas",
  },
  {
    name: "Crossover",
    description:
      "Vehículo construido sobre plataforma de automóvil con características de SUV; carrocería monocasco",
  },
  {
    name: "Motocicleta",
    description: "Vehículo motorizado de dos ruedas",
  },
  {
    name: "Bus",
    description:
      "Vehículo de gran tamaño diseñado para transportar múltiples pasajeros",
  },
  {
    name: "Camión",
    description:
      "Vehículo de carga pesada diseñado principalmente para el transporte de mercancías",
  },
  {
    name: "Station Wagon",
    description:
      "Familiar con techo extendido hasta la parte trasera e integración del maletero al habitáculo",
  },
  {
    name: "Casa rodante",
    description:
      "Vehículo motorizado o remolcable con habitáculo incorporado para vivienda temporal",
  },
  {
    name: "Remolque",
    description:
      "Vehículo sin motor diseñado para ser arrastrado; usado para carga o vivienda",
  },
];

const maintenanceTypes = [
  { name: "Cambio de aceite", description: "Reemplazo de aceite y filtro" },
  { name: "Revisión de frenos", description: "Inspección del sistema de frenos" },
  { name: "Rotación de neumáticos", description: "Rotación y balanceo" },
];

const fuelTypes = [
  { name: "Gasolina", description: "Motor a gasolina" },
  { name: "Diésel", description: "Motor diésel" },
  { name: "Eléctrico", description: "Motor eléctrico" },
  { name: "Híbrido", description: "Motor híbrido gasolina/eléctrico" },
  { name: "GLP", description: "Gas licuado de petróleo" },
  { name: "GNC", description: "Gas natural comprimido" },
];

async function main() {
  const countryByCode = new Map<string, { id: number }>();

  for (const country of countries) {
    let record = await prisma.country.findUnique({
      where: { code: country.code },
    });

    if (!record) {
      record = await prisma.country.findUnique({
        where: { name: country.name },
      });
    }

    if (!record) {
      record = await prisma.country.create({ data: country });
    }

    countryByCode.set(country.code, record);
  }

  const brandByKey = new Map<string, { id: number }>();

  for (const brand of brands) {
    const country = countryByCode.get(brand.countryCode);
    if (!country) {
      throw new Error(`País no encontrado: ${brand.countryCode}`);
    }

    const record = await prisma.brand.upsert({
      where: {
        name_countryId: { name: brand.name, countryId: country.id },
      },
      update: {},
      create: { name: brand.name, countryId: country.id },
    });
    brandByKey.set(`${brand.name}:${brand.countryCode}`, record);
  }

  for (const model of models) {
    const brand = brandByKey.get(`${model.brandName}:${model.countryCode}`);
    if (!brand) {
      throw new Error(`Marca no encontrada: ${model.brandName}`);
    }

    await prisma.model.upsert({
      where: { brandId_name: { brandId: brand.id, name: model.name } },
      update: {},
      create: { name: model.name, brandId: brand.id },
    });
  }

  for (const type of vehicleTypes) {
    await prisma.vehicleType.upsert({
      where: { name: type.name },
      update: { description: type.description },
      create: type,
    });
  }

  for (const type of maintenanceTypes) {
    await prisma.maintenanceType.upsert({
      where: { name: type.name },
      update: {},
      create: type,
    });
  }

  for (const type of fuelTypes) {
    await prisma.fuelType.upsert({
      where: { name: type.name },
      update: { description: type.description },
      create: type,
    });
  }

  const chile = countryByCode.get("CHL");
  if (!chile) {
    throw new Error("País Chile no encontrado");
  }

  await prisma.user.upsert({
    where: { email: "demo@autohunt.dev" },
    update: {},
    create: {
      username: "demo",
      firstName: "Usuario",
      lastName: "Demo",
      name: "Usuario Demo",
      email: "demo@autohunt.dev",
      emailVerified: true,
      password: await hashPassword("demo12345"),
      countryId: chile.id,
    },
  });

  console.log("✅ Seed completado");
  console.log(`   Países: ${countries.length}`);
  console.log(`   Marcas: ${brands.length}`);
  console.log(`   Modelos: ${models.length}`);
}

main()
  .catch((error) => {
    console.error("❌ Error en seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
