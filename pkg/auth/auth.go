package auth

import (
	"fmt"
	"time"
)

type Claims struct {
	Username string `json:"user"`
	Expires  int64  `json:"exp"`
}

func (c Claims) Valid() error {
	now := time.Now().Unix()

	if c.Expires >= now {
		return fmt.Errorf("token has expired")
	}

	return nil
}
