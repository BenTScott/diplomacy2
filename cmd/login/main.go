package main

import (
	"encoding/json"
	"fmt"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/secretsmanager"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	"github.com/golang-jwt/jwt"
	"github.com/julienschmidt/httprouter"
	"log"
	"net/http"
	"os"
)

var r *httprouter.Router

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

	r = httprouter.New()
	r.POST("/login", loginHandler)
	r.NotFound = notFoundHandler{}
}

func main() {
	lambda.Start(httpadapter.New(r).ProxyWithContext)
}

type notFoundHandler struct{}

func (n notFoundHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("Unmapped route - %v\n", *r)
	w.WriteHeader(http.StatusNotFound)
}

type loginReq struct {
	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`
}

type loginResp struct {
	AccessToken string `json:"access_token,omitempty"`
}

func loginHandler(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
	body, err := parseBody[loginReq](r)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS512, jwt.MapClaims{
		"user":    body.Username,
		"expires": 1500,
	})

	ss, err := token.SignedString(accessSecret)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	lr := loginResp{ss}

	fmt.Println(body)
	en := json.NewEncoder(w)

	if err := en.Encode(&lr); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func parseBody[T any](r *http.Request) (out T, err error) {
	decoder := json.NewDecoder(r.Body)
	err = decoder.Decode(&out)
	return
}
