
require("dotenv").config();
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose=require("mongoose");
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy=require("passport-google-oauth20").Strategy;
const findOrCreate=require("mongoose-findorcreate");
const http=require("http");
const server=http.createServer(app);
const {Server}=require("socket.io");
const io = new Server(server);


const port=process.env.PORT || 3000; 


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


/////////////////////////////////connect database and user schema////////////////////////////////////

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true});

const userSchema=new mongoose.Schema({
   email:String,
   password:String,
   firstName:String,
   lastName:String,
   phone:String,
   college: mongoose.ObjectId 
});

const collegeSchema=new mongoose.Schema({
   collegename:String,
   collegeid:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User=new mongoose.model("User",userSchema);
const College=new mongoose.model("College",collegeSchema);
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


//////////////////////////////////The Routes for the Common Pages////////////////////////////////////

app.get("/",  (req, res) => {
   res.render("home");
});


app.get("/login",(req,res)=>{
   res.render("login");
});

app.get("/register",(req,res)=>{
   res.render("register");
});
app.get("/forgot",(req,res)=>{
   res.render("forgot");
});

app.get("/colleges",(req,res)=>{
   res.render("allcolleges");
});


app.get("/aboutus",(req,res)=>{
   res.render("about");
});

// app.get("/colleges/:college",(req,res)=>{
//    res.render("college",{collegeName:req.params.college});

// });

//////////////////////////////Local Authentication Part/////////////////////////////////////////////


app.get("/afterlogin",(req,res)=>{
   if(req.isAuthenticated()){
      res.render("afterlogin");
   }
   else{
      res.redirect("/login");
   }
   User.find({ username: req.body.username}, function (err, docs) {
      if (err){
         console.log(err);
      }
      else{
        // college= docs[0].college
      }
  });
   
});


app.get("/logout",(req,res)=>{

   req.logout((err)=>{
      if (err) { return next(err); }
      res.redirect('/');
    });
  

});


app.post("/register",(req,res)=>{
   
   College.findOne({collegename:req.body.college},(err,doc)=>{
      if(err){
         console.log("register ",err);
      }
      else{
         console.log(doc.id);
         User.register({
            username:req.body.username,
            firstName:req.body.fname,
            lastName:req.body.lname,
            phone:req.body.phone,
            college:doc.id
            },req.body.password,(err,user)=>{
            if(err){
               console.log(err);
               res.redirect("/login");
            }
            else{
               passport.authenticate("local")(req,res,()=>{
                  res.redirect("/afterlogin");
               });
               
            }
        });
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
         User.find({ username: req.body.username}, function (err, docs) {
            if (err){
               console.log(err);
            }
            else{
               //college= docs[0].college
               console.log("Ok");
            }
        });
      }
   })

});

//////////////////////////////////google OAuth(didn't work)//////////////////////////////////////////

app.get("/auth/google",(req,res)=>{

   passport.authenticate("google");

});

app.get("/auth/google/afterlogin",
passport.authenticate("google",{failureRedirect:"/login"}),(req,res)=>{
   res.redirect("/afterlogin");

});

/////////////////////////////Chat system with  profile page (Failed)////////////////////////////////


app.get("/afterlogin/profile",(req,res)=>{
   if(req.isAuthenticated()){
      res.render("profile");
   }
   else{
      res.redirect("/login");
   }

});

app.get("/afterlogin/college/:clubname",(req,res)=>{

    clubname=req.params["clubname"];
    res.render("chat");
});
app.get("/chat",(req,res)=>{

   
   res.sendFile(__dirname+"/page1.html");
});
app.get("/get-club",(req,res)=>{
   
    res.json(clubname);
    
});


const myNamespaceIO=io.of("/admin");
myNamespaceIO.on('connect', (socket) => {
    console.log("user connected");
    socket.on("join",(data)=>{
        socket.join(data.room);
        myNamespaceIO.in(data.room).emit("chat message",`new person joined the ${data.room}`);
    })

    socket.on('chat message', (data) => {
        console.log("chat msg",data);
        myNamespaceIO.in(data.room).emit('chat message', data.msg);
    });
    
    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
});

///////////////////////////////Listening to Port 3000////////////////////////////////////////////////

app.listen(port, ()=> {
   
   console.log("Listening at ",port)
});