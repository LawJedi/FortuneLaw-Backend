const mailer = require("nodemailer");

let transport = mailer.createTransport({
	host: "smtp.zoho.eu",
	port: 465,
	secure: true,
	auth: {
		user: "support@goldenigic.com",
		pass: "Dbf^3&dgD^"
	},
})

let clientMail =  async function(to, data){
	let succ = await transport.sendMail({
		from: "Golden IGIC <support@goldenigic.com>",
		to: to,
		subject: "Client Form Submission",
		html: `<html>
		<body>
			<h3>${data.agent_last_name},</h3>
			<br>
			<b>${data.fname} ${data.lname}</b> just filled out the GOLDEN DEBT questionnaire. You should be able to access it through your account at <a href="http://qualyval.mynetgear.com:4020/">goldenigic.com</a>. Upload the debt spreadsheet to the client’s profile to generate the GOLDEN pdf.
		</body>
	</html>`
	})
	return succ ? true : false 
}

let registrationMail =  async function(data){
	let succ = await transport.sendMail({
		from: "Golden IGIC <support@goldenigic.com>",
		to: "zach@fortunefirm.com",
		subject: "Agent Registration",
		html: `<html>
		<body>
			<h3>Zach,</h3>
			<br>
			<b>${data.first_name} ${data.last_name}</b> registered at Golden IGIC on ${new Date(data.date).toDateString()} and is awaiting your approval.
		</body>
	</html>`
	})
	return succ ? true : false 
}

let resetMail = async function(to, link){
	let succ = await transport.sendMail({
		from: "Golden IGIC <support@goldenigic.com>",
		to: to,
		subject: "Password Reset",
		html: `<html>
		<body>
			<h3>Password Reset Link</h3>
			<br>
			Click on the link below to reset your password: <br>
			<a href="${link}">${link}</a>
		</body>
	</html>`
	})
	return succ ? true : false 
}

module.exports = {
	clientMail,
	registrationMail,
	resetMail
};
