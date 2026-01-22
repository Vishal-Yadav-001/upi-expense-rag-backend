const express = require('express');
const {ApolloServer,gql} = require("apollo-server-express");

const typeDefs = gql`
type Query{
  hello: String
}
`;

const resolvers ={
    Query:{
        hello:() => 'Hello world!'
    }
}

async function startServer(){
    const app = express();

    const server = new ApolloServer({typeDefs,resolvers});
    await server.start();
    server.applyMiddleware({app, path:'/graphql'});

    app.listen(4000,()=>{
        console.log('Server is running on http://localhost:4000/graphql');
    })
};

startServer();