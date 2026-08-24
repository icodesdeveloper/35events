import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function main() {
  await prisma.event.deleteMany();

  await prisma.event.createMany({
    data: [
      {
        slug: "ardennen-najaarsrit-2026",
        name: "Ardennen Najaarsrit",
        description:
          "Een dagvullende rondrit door de Ardense heuvels langs kasseiwegen en panoramische uitzichten, met een stop voor lunch onderweg. Verzamelen 's ochtends, gezamenlijk vertrek in konvooi.",
        date: daysFromNow(45),
        distanceKm: 180,
        durationMinutes: 300,
        price: 35,
        passengerPrice: 15,
        published: true,
        registrationOpen: true,
      },
      {
        slug: "zomer-cars-coffee-2026",
        name: "Cars & Coffee Zomerspecial",
        description:
          "Informele meet op een groot terrein, gratis koffie voor deelnemers. Geen vaste route — gewoon aanschuiven en genieten van elkaars wagens.",
        date: daysFromNow(20),
        published: true,
        registrationOpen: false,
      },
      {
        slug: "kust-toer-2026",
        name: "Kusttoer",
        description:
          "Rustige rit langs de kustlijn met twee fotostops. Ideaal voor een eerste keer meerijden — geen hoge snelheden, wel mooie wagens.",
        date: daysFromNow(75),
        endDate: daysFromNow(76),
        distanceKm: 220,
        durationMinutes: 240,
        price: 25,
        published: true,
        registrationOpen: true,
      },
      {
        slug: "voorjaarsrit-2026",
        name: "Voorjaarsrit door de Kempen",
        description:
          "De eerste rit van het seizoen door bosrijke Kempense wegen, afgesloten met een gezamenlijke BBQ.",
        date: daysFromNow(-40),
        distanceKm: 150,
        durationMinutes: 210,
        price: 30,
        published: true,
        registrationOpen: false,
      },
      {
        slug: "winter-meet-2025",
        name: "Winter Meet",
        description:
          "Kleinschalige winterse meet in een verwarmde loods, met foodtrucks en livemuziek.",
        date: daysFromNow(-95),
        published: true,
        registrationOpen: false,
      },
    ],
  });

  console.log("Seed compleet.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
