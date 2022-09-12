
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose=require("mongoose");
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy=require("passport-google-oauth20").Strategy;
const findOrCreate=require("mongoose-findorcreate");



var app = express();


app.use(express.static("/public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
   extended: true
 }));


app.use(session({
   secret:"Our little secret.",
   resave:false,
   saveUninitialized:false,

}));

app.use(passport.initialize());

app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true});



const userSchema=new mongoose.Schema({
   email:String,
   password:String,
   firstName:String,
   lastName:String,
   phone:String,
   college:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User=new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

passport.use(new GoogleStrategy({
   clientID: process.env.CLIENT_ID,
   clientSecret: process.env.CLIENT_SECRET,
   callbackURL: "http://localhost:3000/auth/google/afterlogin",
   userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
 },
 function(accessToken, refreshToken, profile, cb) {
   User.findOrCreate({ googleId: profile.id }, function (err, user) {
     return cb(err, user);
   });
 }
));


app.get("/",  (req, res) => {
   res.render("home");
});

app.get("/auth/google",(req,res)=>{

   passport.authenticate("google");

});

app.get("/auth/google/afterlogin",
passport.authenticate("google",{failureRedirect:"/login"}),(req,res)=>{
   res.redirect("/afterlogin");

});

app.get("/login",(req,res)=>{
   res.render("login");
});

app.get("/register",(req,res)=>{
   res.render("register");
})
app.get("/afterlogin",(req,res)=>{
   if(req.isAuthenticated()){
      res.render("afterlogin");
   }
   else{
      res.redirect("/login");
   }
   
});
app.get("/forgot",(req,res)=>{
   res.render("forgot");
});

app.get("/logout",(req,res)=>{

   req.logout((err)=>{
      if (err) { return next(err); }
      res.redirect('/');
    });
  

});


app.post("/register",(req,res)=>{

  User.register({
      username:req.body.username,
      firstName:req.body.fname,
      lastName:req.body.lname,
      phone:req.body.phone,
      college:req.body.college
      },req.body.password,(err,user)=>{
      if(err){
         console.log(err);
         res.redirect("/login");
      }
      else{

         passport.authenticate("local")(req,res,()=>{
            res.redirect("/afterlogin");
         })
      }
  })

   
});

app.post("/login",(req,res)=>{

   const user=new User({
      username:req.body.username,
      password:req.body.password
   });

   req.login(user,(err)=>{
      if(err){
         console.log(err);
      }
      else{
         passport.authenticate("local")(req,res,()=>{
            res.redirect("/afterlogin");
         });
      }
   })

});

app.listen(3000, ()=> {
   
   console.log("Listening at 3000")
});