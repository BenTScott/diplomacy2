package main

import (
	"fmt"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	"github.com/julienschmidt/httprouter"
	"net/http"
)

var r *httprouter.Router

func init() {
	r = httprouter.New()
	r.GET("/user", handleUser)

}

func handleUser(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
	fmt.Println(*r)
	w.WriteHeader(http.StatusOK)
}

func main() {
	lambda.Start(httpadapter.New(r).ProxyWithContext)
}
