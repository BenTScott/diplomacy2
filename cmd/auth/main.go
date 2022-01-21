package main

import (
	"context"
	"fmt"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func main() {
	lambda.Start(handleRequest)
}

type myContext struct {
	AString string `json:"aString"`
}

type authResponse struct {
	IsAuthorized bool      `json:"isAuthorized"`
	Context      myContext `json:"context"`
}

func handleRequest(ctx context.Context, event events.APIGatewayV2HTTPRequest) (authResponse, error) {
	fmt.Println(event)
	return authResponse{
		IsAuthorized: true,
		Context:      myContext{AString: "hello world!!"},
	}, nil
}