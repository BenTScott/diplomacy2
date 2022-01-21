package main

import (
	"fmt"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"net/http"
)

func main() {
	lambda.Start(handler)
}

func handler(event events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	fmt.Println(event)
	fmt.Println(event.RawPath)

	return events.APIGatewayV2HTTPResponse{
		StatusCode: http.StatusOK,
		Headers:    nil,
		Body:       "Hello from this one",
		Cookies:    nil,
	}, nil
}
