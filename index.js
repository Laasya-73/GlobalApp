
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


/* 
user{ 
   userid:object
  email:String,
  password:String,
   firstName:String,
   lastName:String,
   phone:String,
   college:CollegeID,
   clubs: array of clubId
   requests : array of Strings
}

college{
   CollegeID: objectid
	name:String
	clubNames:array of clubId
   students : array of userId
   leader : userId
}

club{
   clubId: objectid
   name:String,
	description: String
   students : array of userId
   leader : userId
} */

const userSchema=new mongoose.Schema({
   email:String,
   password:String,
   firstName:String,
   lastName:String,
   phone:String,
   college:String,
   clubs: [String]
});

const collegeSchema=new mongoose.Schema({
   collegename:String,
   collegeid:String,
   students : [String],
});

const clubSchema=new mongoose.Schema({
   collegeid:String,
   clubname:String,
	description: String,
   students:[String]
});



userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User=new mongoose.model("User",userSchema);
const College=new mongoose.model("College",collegeSchema);
const Club=new mongoose.model("Club",clubSchema);


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


/////////////////////The Routes for the Common Pages before Login////////////////////////////////////

app.get("/",  (req, res) => {
   
   res.render("home",{authentication:checkAuthentication(req)});
      
});


app.get("/login",(req,res)=>{

   res.render("login",{Message:"Enter username and password"});
});

app.get("/register",(req,res)=>{
   res.render("register");
});
app.get("/forgot",(req,res)=>{
   res.render("forgot");
});

app.get("/colleges",(req,res)=>{ // common route for both login and without login

   College.find({},(err,colleges)=>{
      var clgMap =[];
      
      colleges.forEach(function(clg) {
         clgMap.push(clg.collegename);
      });
      console.log(clgMap);
      res.render("allcolleges",{authentication:checkAuthentication(req),colleges:clgMap});

   })
   
});

app.get("/aboutus",(req,res)=>{
   
   res.render("about",{authentication:checkAuthentication(req)});

});


app.get("/colleges/:collegename",(req,res)=>{

   College.findOne({collegename:req.params.collegename},(err,clg)=>{
      if(err){
         console.log(err);
      }
      else{
         Club.find({collegeid:clg.collegeid},(err,clubs)=>{
            if(err){
               console.log(err);
            }
            else{
               var clubMap=[];
               clubs.forEach((club)=>{
                  clubMap.push(club.clubname);
               });
               res.render("college",{authentication:checkAuthentication(req),CollegeName:req.params.collegename,clubs:clubMap,NumberOfStudents:clg.students.length});
      
            }
         });
      }
   })
 

});

app.get("/colleges/:collegename/:club",(req,res)=>{
   
   College.findOne({collegename:req.params.collegename},(err,clg)=>{
      if(err){
         console.log(err);
      }
      else{
         Club.findOne({collegeid:clg.collegeid,clubname:req.params.club},(err,club)=>{
            if(err){
               console.log(err);
            }
            else{
               
               res.render("club",{authentication:checkAuthentication(req),NumberOfStudents:club.students.length,Collegename:req.params.collegename,Clubname:club.clubname,Description:club.description});
      
            }
         });
      }
   })
   
});


app.get("/colleges/:collegename/list/students",(req,res)=>{

  
   College.findOne({collegename:req.params.collegename},(err,clg)=>{
      if(err){
         console.log(err);
      }
      else{
         var students=clg.students;

         res.render("listofstudents",{
            authentication:checkAuthentication(req),
            CollegeName:req.params.collegename,
            NumberOfStudents:students.length,
            Students:students
         });

      }
   });

});

app.get("/colleges/:collegename/:club/join",(req,res)=>{

   if(req.isAuthenticated()){

      res.render("afterlogin/joinclubform",{Prompt:"Join Re",CollegeName:req.params.collegename,ClubName:req.params.club})

   }
   else{
      res.redirect("/login");
   }


});
app.post("/colleges/:collegename/:club/join",(req,res)=>{

   if(req.isAuthenticated() ){

      if(req.user.username===req.body.username){

         User.findOne({username:req.body.username},(err,user)=>{
            if(err){
               console.log(err);
            }
            else{
               Club.findOne({collegename:req.user.college,clubname:req.params.club},(err,club)=>{
                  if(err){
                     console.log(err);
                  }
                  else{
                     club.students.push(req.body.username);
                     club.save((err,res)=>{
                        if(err){
                           console.log(err);
                        }
                        else{
                           console.log(res);
                        }
                     })
                  }
               })
               user.clubs.push(req.params.club);
               user.save((err,result)=>{
                  if (err){
                     console.log(err);
                 }
                 else{
                     console.log(result)
                 }
               })
               res.send("Succesfully Joined the "+req.params.club);
               
            }
         }) 

      }
      else{
         res.render("afterlogin/joinclubform",{Prompt:"Enter valid Email Address",
            CollegeName:req.params.collegename,ClubName:req.params.club})

      }
   }
   else{
      res.redirect("/login");
   }


});




///////////////////////////////Routes for pages after login//////////////////////////////////////////


app.get("/loggedin/myprofile",(req,res)=>{

   if(req.isAuthenticated()){


      res.render("afterlogin/myprofile",{Clubs:req.user.clubs});
   }
   else{
      res.redirect("/login");
   }
   
});

app.get("/loggedin/colleges/college",(req,res)=>{
 
   if(req.isAuthenticated()){

      console.log(req.user);
      College.findOne({collegeid:req.user.college},(err,doc)=>{
         
         if(err){
            console.log(err);
         }
         else{
            res.render("college",{authentication:true,CollegeName:doc.collegename}); 
         }

      })
       
   }
   else{
      res.redirect("/login");
   }
   
});



//////////////////////////////Local Authentication Part/////////////////////////////////////////////


app.get("/logout",(req,res)=>{

   req.logout((err)=>{
      if (err) { return next(err); }
      res.redirect('/');
    });
  

});


app.post("/register",(req,res)=>{
   
   College.findOne({collegename:req.body.college},(err,clg)=>{
      if(err){
         console.log("register ",err);
      }
      else{
         
         clg.students.push(req.body.username);
         clg.save(function(err,result){
            if (err){
                console.log(err);
            }
            else{
                console.log(result)
            }
        })
         
         User.register({
            username:req.body.username,
            firstName:req.body.fname,
            lastName:req.body.lname,
            phone:req.body.phone,
            college:clg.collegeid
            },req.body.password,(err,user)=>{
            if(err){
               console.log(err);
               res.redirect("/login");
            }
            else{
               passport.authenticate("local")(req,res,()=>{
                  res.redirect("/");
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
         passport.authenticate("local", {failureRedirect:'/loginerror' })(req,res,()=>{
            
            res.redirect("/");
         });
         
      }
   })

});

app.get("/loginerror",(req,res)=>{
   res.render("login",{Message:"Email or the password is incorrect"});
})


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


const checkAuthentication=(req)=>{
   if(req.isAuthenticated()){
      return true;
   }
   return false;
}
