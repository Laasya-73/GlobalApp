
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose=require("mongoose");
const encrypt=require("mongoose-encryption");


var app = express();

app.use(express.static("/public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
   extended: true
 }));

 mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true});

const userSchema=new mongoose.Schema({
   email:String,
   password:String
});



userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:["password"]});

const User=new mongoose.model("User",userSchema);

app.get("/",  (req, res) => {
   res.render("home");
});
app.get("/login",(req,res)=>{
   res.render("login");
})
app.get("/afterlogin",(req,res)=>{
   res.render("afterlogin");
})
app.get("/forgot",(req,res)=>{
   res.render("forgot");
})

app.post("/signup",(req,res)=>{

   const newUser=new User({
      email:req.body.username,
      password:req.body.password
   });
   newUser.save((err)=>{
      if(err){
         console.log(err);
      }
      else{
         res.send("Successfull");

      }

   });
});

app.post("/login",(req,res)=>{

   const username=req.body.username;
   const password=req.body.password;
   console.log(username,password);
   User.findOne({email:username},(err,foundUser)=>{
      if(err){
         console.log(err);
      }
      else{
         if(foundUser && foundUser.password===password){
            res.send("loggedIn");
         }
      }
   })

});

app.listen(3000, ()=> {
   
   console.log("Listening at 3000")
});