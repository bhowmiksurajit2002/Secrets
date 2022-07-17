//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const mongoose = require("mongoose");

const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require( "passport-google-oauth2" ).Strategy;
const findOrCreate = require('mongoose-find-or-create');
app.set('view engine','ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
    secret:"Our little secret",
    resave: false,
    saveUninitialized:false

}));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb+srv://surajit-bhowmik:cse20079le@cluster0.h3rbi8c.mongodb.net/userDB",{useNewUrlParser:true});

//mongoose.set("useCreateIndex",true);
const userSchema= new mongoose.Schema({
    email:String,
    password:String,
    secret:String,
    googleId:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function (err, user) {
      done(err, user);
    });
  });


passport.use(new GoogleStrategy({
    clientID:     process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:4000/auth/google/secrets",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));


app.get("/",function(req,res){
    res.render("home");
});
app.get("/login",function(req,res){
    res.render("login");
});
app.get("/register",function(req,res){
    res.render("register");
});
app.get("/secrets",function(req,res){
   User.find({"secret":{$ne:null}},function(err,foundSecrets){
    if(err){
        console.log("Error");
    }
    else{
        res.render("secrets",{userSecrets:foundSecrets});
    }
   });
});

app.get("/submit",function(req,res){
    if(req.isAuthenticated()){
        res.render("submit");
    }
    else{
        res.redirect("/login");
    }
})

app.get('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });
  app.get('/auth/google',
  passport.authenticate('google', { scope:
      [ 'email', 'profile' ] }
));

app.get( "/auth/google/secrets",
    passport.authenticate( 'google', {
        successRedirect: "/secrets",
        failureRedirect: "/login"
}));

app.post("/register",function(req,res){

    User.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    })
    
    
});

app.post("/login",function(req,res){
 
    const user = new User({
        username:req.body.username,
        password:req.body.password
    });
    req.login(user,function(err){
        if(err){
            console.log(err);
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/submit",function(req,res){
    const submittedSecret = req.body.secret;
    console.log(submittedSecret);
    console.log(req.user);
    User.findById(req.user.id,function(err,foundUser){
        if(err){
            console.log(err);
        }
        else{
            console.log(foundUser);
            foundUser.secret = submittedSecret;
            console.log(foundUser.secret);
            foundUser.save(function(){
                res.redirect("/secrets");
            })
        }
    });
})

let port = process.env.PORT;
if (port == null || port == "") {
  port = 4000;
}

app.listen(port,function(){
    console.log("App is running on port 4000");
});