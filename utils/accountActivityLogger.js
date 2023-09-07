// utils/accountActivityLogger.js
function logAccountActivity(user, activityType, req) {
  const accountActivity = {
    activityType,
    activityTime: new Date(),
    deviceInfo: req.headers["user-agent"],
    ipAddress: req.ip,
  }
  user.accountActivities.push(accountActivity)
}

module.exports = logAccountActivity
