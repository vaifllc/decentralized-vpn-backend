exports.requireAdmin = (req, res, next) => {
  const user = req.auth // Assuming JWT authentication sets req.auth

  if (!user) {
    return res.status(401).json({ error: "User not authenticated" })
  }

  if (user.role !== "admin") {
    return res.status(403).json({ error: "User not authorized" })
  }

  next()
}

exports.hasPermission = (permission) => {
  return (req, res, next) => {
    const user = req.auth

    if (!user) {
      return res.status(401).json({ error: "User not authenticated" })
    }

    if (!user.permissions.includes(permission)) {
      return res.status(403).json({ error: "User not authorized" })
    }

    next()
  }
}
