var express = require('express');
var app = express();

app.use(express.static('/public'));


app.get('/',  (req, res) => {
   res.sendFile('public/home.html' , { root : __dirname});
});
app.get("/login",(req,res)=>{
   res.sendFile('public/login.html' , { root : __dirname});
})
app.get("/afterlogin",(req,res)=>{
   res.sendFile('public/afterlogin.html' , { root : __dirname});
})
app.get("/forgot",(req,res)=>{
   res.sendFile('public/forgot.html' , { root : __dirname});
})

app.listen(3600, ()=> {
   
   console.log("Listening at 3600")
});