package main

import (
	"context"
	"fmt"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/secretsmanager"
	"github.com/golang-jwt/jwt"
	"log"
	"os"
	"strings"
)

var accessSecret []byte

func init() {
	sess := session.Must(session.NewSession())
	secrets := secretsmanager.New(sess)
	sv, err := secrets.GetSecretValue(&secretsmanager.GetSecretValueInput{
		SecretId: aws.String(os.Getenv("ACCESS_TOKEN_SECRET")),
	})

	if err != nil {
		log.Fatalln(err)
	}

	accessSecret = sv.SecretBinary
}

func main() {
	lambda.Start(handleRequest)
}

type myContext struct {
	AString string `json:"aString"`
}

type authResponse struct {
	IsAuthorized bool          `json:"isAuthorized"`
	Context      jwt.MapClaims `json:"context"`
}

func handleRequest(ctx context.Context, event events.APIGatewayV2HTTPRequest) (resp authResponse, err error) {
	fmt.Println(event)

	resp = authResponse{
		IsAuthorized: false,
	}

	header, ok := event.Headers["Authorization"]

	if !ok {
		return
	}

	splitToken := strings.SplitN(header, " ", 2)
	if len(splitToken) == 1 {
		return
	}

	accessToken := splitToken[1]

	token, err := jwt.Parse(accessToken, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		return accessSecret, nil
	})

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return authResponse{
			IsAuthorized: true,
			Context:      claims,
		}, nil
	} else {
		fmt.Println(err)
		return
	}
}
