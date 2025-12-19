const express = require('express');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

module.exports = (oidc) => {
  const router = express.Router();

  router.get('/interaction/:uid', async (req, res, next) => {
    try {
      const details = await oidc.interactionDetails(req, res);
      const { uid, prompt, params } = details;

      // Check if user is already logged in via main app cookies
      const token = req.cookies?.accessToken;
      let user = null;

      if (token && process.env.JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          user = await User.findById(decoded.userId);
        } catch (err) {
          // Token invalid or expired
        }
      }

      if (prompt.name === 'login') {
        if (user) {
          // User is already logged in, complete the interaction
          const result = {
            login: {
              accountId: user._id.toString(),
            },
          };
          return await oidc.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
        }

        // User not logged in, redirect to main login page
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const returnTo = `${process.env.OIDC_ISSUER || 'https://sprylogin.com'}/oidc/interaction/${uid}`;
        return res.redirect(`${frontendUrl}/login?returnTo=${encodeURIComponent(returnTo)}`);
      }

      if (prompt.name === 'consent') {
        const result = {
          consent: {
            grantId: details.grantId,
          },
        };
        return await oidc.interactionFinished(req, res, result, { mergeWithLastSubmission: true });
      }

      return next();
    } catch (err) {
      next(err);
    }
  });

  return router;
};
