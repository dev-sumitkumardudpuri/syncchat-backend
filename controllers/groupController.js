import Group from "../models/Group.js";

// @desc    Get all groups (Permanent + User Created)
// @route   GET /api/groups
export const getGroups = async (req, res) => {
  try {
    const groups = await Group.find().sort({ isPermanent: -1, createdAt: 1 });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch groups." });
  }
};

// @desc    Create a new custom group
// @route   POST /api/groups
export const createGroup = async (req, res) => {
  try {
    const { name, description, userId } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Group name is required." });
    }

    const existingGroup = await Group.findOne({ name: name.trim() });
    if (existingGroup) {
      return res.status(400).json({ message: "Group name already exists." });
    }

    const newGroup = await Group.create({
      name: name.trim(),
      description: description || "",
      createdBy: userId || null,
      members: userId ? [userId] : [],
      isPermanent: false,
    });

    res.status(201).json(newGroup);
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Failed to create group." });
  }
};
