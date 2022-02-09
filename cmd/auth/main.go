package main

import (
	"diplomacy/pkg/auth"
	"fmt"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/golang-jwt/jwt"
	"strings"
)

var accessSecret []byte

func init() {
	accessSecret = auth.GetAccessTokenSecret(session.Must(session.NewSession()))
}

func main() {
	lambda.Start(handleRequest)
}

type LambdaContext struct {
	Username string `json:"username,omitempty"`
}

type authResponse struct {
	IsAuthorized bool          `json:"isAuthorized"`
	Context      LambdaContext `json:"context"`
}

func handleRequest(request events.APIGatewayV2HTTPRequest) (resp authResponse, err error) {
	fmt.Println(request)

	resp = authResponse{
		IsAuthorized: false,
	}

	header, ok := request.Headers["authorization"]

	if !ok {
		fmt.Println("Authorization header missing.")
		return
	}

	splitToken := strings.SplitN(header, " ", 2)
	if len(splitToken) == 1 {
		return
	}

	accessToken := splitToken[1]

	token, err := jwt.ParseWithClaims(accessToken, &auth.Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		return accessSecret, nil
	})

	if err != nil {
		fmt.Println("Token is invalid", err)
		return resp, nil
	}

	if claims, ok := token.Claims.(*auth.Claims); ok && token.Valid {
		return authResponse{
			IsAuthorized: true,
			Context:      LambdaContext{Username: claims.Username},
		}, nil
	} else {
		fmt.Println("Token invalid", token.Claims)
		return resp, nil
	}
}
