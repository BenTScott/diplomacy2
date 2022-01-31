package main

import (
	"encoding/json"
	"fmt"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/secretsmanager"
	"github.com/golang-jwt/jwt"
	"log"
	"net/http"
	"os"
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
	lambda.Start(loginHandler)
}

type loginReq struct {
	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`
}

type loginResp struct {
	AccessToken string `json:"access_token,omitempty"`
}

func loginHandler(req events.APIGatewayV2HTTPRequest) (resp events.APIGatewayV2HTTPResponse, err error) {
	resp = events.APIGatewayV2HTTPResponse{
		StatusCode:        http.StatusBadRequest,
		Headers:           nil,
		MultiValueHeaders: nil,
		IsBase64Encoded:   false,
		Cookies:           nil,
	}

	if req.RequestContext.HTTP.Method != http.MethodPost {
		resp.StatusCode = http.StatusNotFound
		return
	}

	body, err := parseBody[loginReq](req.Body)
	if err != nil {
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS512, jwt.MapClaims{
		"user":    body.Username,
		"expires": 1500,
	})

	ss, err := token.SignedString(accessSecret)
	if err != nil {
		return
	}

	lr := loginResp{ss}

	fmt.Println(body)

	respBody, err := json.Marshal(&lr)

	if err != nil {
		resp.StatusCode = http.StatusBadRequest
		return
	}

	resp.Body = string(respBody)
	resp.StatusCode = http.StatusOK
	return
}

func parseBody[T any](body string) (out T, err error) {
	err = json.Unmarshal([]byte(body), &out)
	return
}
