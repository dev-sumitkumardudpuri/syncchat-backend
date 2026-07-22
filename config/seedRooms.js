import Group from "../models/Group.js";

const defaultGroups = [
  {
    name: "The Lounge",
    description: "Normal Talk - Casual chit-chat & chill",
    isPermanent: true,
  },
  {
    name: "Fun Zone",
    description: "Entertainment, memes, movies & music",
    isPermanent: true,
  },
  {
    name: "Tech & Work",
    description: "Study, coding, career & tech discussions",
    isPermanent: true,
  },
  {
    name: "Sports Club",
    description: "Match updates & sports chat",
    isPermanent: true,
  },
];

export const seedDefaultGroups = async () => {
  try {
    for (const group of defaultGroups) {
      const exists = await Group.findOne({ name: group.name });
      if (!exists) {
        await Group.create(group);
        console.log(`Seeded default group: ${group.name}`);
      }
    }
  } catch (error) {
    console.error("Group seeding error:", error.message);
  }
};
