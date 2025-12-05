import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "../db.js";
import dotenv from "dotenv";

dotenv.config();

passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
			callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
			passReqToCallback: false,
		},
		async (_, __, profile, done) => {
			try {
				const { id: googleId, emails, name } = profile;

				const email = emails?.[0]?.value;
				if (!email)
					return done(new Error("Google email missing"), false);

				let user = await prisma.user.findUnique({ where: { email } });

				if (!user) {
					user = await prisma.user.create({
						data: {
							email,
							googleId,
							firstName: name?.givenName ?? "User",
							lastName: name?.familyName ?? "",
							avatarUrl: null,
							isVerified: true,
						},
					});
				} else if (!user.googleId) {
					user = await prisma.user.update({
						where: { id: user.id },
						data: { googleId },
					});
				}

				return done(null, user);
			} catch (err) {
				return done(err, false);
			}
		}
	)
);
