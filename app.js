const env = require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const googleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

// Creating the express module and setting some properties.
const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.use(express.static("public"));  
app.use(session({
    secret:"This is secret", 
    resave: false,
    saveUninitialized: false  
}));
app.use(passport.authenticate('session'));

// Setting the passport package
app.use(passport.initialize());
app.use(passport.session());

// Connecting to mongodb
mongoose.connect("mongodb+srv://PankajSingh:Pankaj%401003@cluster0.8o0wu.mongodb.net/userDB?retryWrites=true&w=majority", {useNewUrlParser: true});

// Creating the mongodb database schema
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
    secrets: String
});

// adding the passport-local-mongoose plugin
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// Creating the mongodb model or collections
const userModel = new mongoose.model("User", userSchema);

// setting up the passport-local-mongoose and 
// Creating the strategy and serialization using the mongoose.model
passport.use(userModel.createStrategy());
passport.serializeUser(function(user, done) {
    done(null, user);
});
   
passport.deserializeUser(function(user, done) {
    done(null, user);
});
// Creating and setting up the strategy for google oauth 
passport.use(new googleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  (accessToken, refreshToken, profile, cb) => {
    userModel.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

// GET routes for home, register, login
app.get("/", (req, res) => {
    res.render("home");
});
// Request made by the user to log-in or register.
app.get("/auth/google", 
    passport.authenticate("google", { scope: ["profile"] })
);

// Get request made by the google to redirect our user back to the desired page
app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
});

app.get("/register", (req, res) => {
    res.render("register");
});
app.get("/login", (req, res) => {
    res.render("login");
});
app.get("/secrets", (req, res) => {
    userModel.find({"secrets": {$ne: null}}, (err, foundUsers) => {
        if (err) {
            console.log(err);
        } else {
            res.render("secrets", {userWithSecrets: foundUsers})
        }
    });
});
app.get("/submit", (req, res) => {
    if (req.isAuthenticated()) {
        console.log("authenticated");
        res.render("submit");
    } else {
        console.log("Couldn't authenticate");
        res.redirect("/login");
    }
})
app.get("/logout", (req, res) => {
    req.logOut();
    res.redirect("/");
})

// POST routes for register, login
app.post("/register", (req, res) => {
    userModel.register({username: req.body.username}, req.body.password, (err, user) => {
        if (err) {
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, ()=> {
                res.redirect("/secrets");
            })
        }
    })
});
app.post("/login", (req, res) => {
    const user = new userModel({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function(err) {
        if (err) { console.log(err); }
        res.render('secrets');
      });
});
app.post("/submit", (req, res) => {
    const id = req.user._id;
    const secret = req.body.secret;
    userModel.findById(id, (err, foundUser) => {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                console.log(foundUser);
                foundUser.secrets = secret;
                foundUser.save((err) => {
                    if (!err){
                        res.redirect("/secrets");
                    } else {
                        console.log(err);
                    }
                });
            } 
        }
    });
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Listening at 3000");
})
