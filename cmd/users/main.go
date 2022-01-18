package main

import (
	"diplomacy/pkg/handler"
	"diplomacy/pkg/model"
	"diplomacy/pkg/store"
	"github.com/julienschmidt/httprouter"
	"log"
	"net/http"
)

func main() {
	r := httprouter.New()

	handler.AddResource(r, "users", store.NewMemStore[model.User]())
	handler.AddResource(r, "games", store.NewMemStore[model.Game]())

	log.Fatal(http.ListenAndServe(":8080", r))
}
