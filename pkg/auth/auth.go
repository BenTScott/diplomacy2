package auth

import (
	"fmt"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/secretsmanager"
	"log"
	"os"
	"time"
)

const AccessTokenEnvironment = "ACCESS_TOKEN_SECRET"

func GetAccessTokenSecret(sess *session.Session) []byte {
	secrets := secretsmanager.New(sess)
	sv, err := secrets.GetSecretValue(&secretsmanager.GetSecretValueInput{
		SecretId: aws.String(os.Getenv(AccessTokenEnvironment)),
	})

	if err != nil {
		log.Fatalln(err)
	}

	return sv.SecretBinary
}

type Claims struct {
	Username string `json:"user"`
	Expires  int64  `json:"exp"`
}

func (c Claims) Valid() error {
	now := time.Now().Unix()

	if c.Expires <= now {
		return fmt.Errorf("token has expired")
	}

	return nil
}
