package handler

import (
	"diplomacy/pkg/store"
	"encoding/json"
	"fmt"
	"github.com/julienschmidt/httprouter"
	"net/http"
)

type Dependencies[T store.Keyed] struct {
	Store store.Store[T]
}

func AddResource[T store.Keyed](r *httprouter.Router, name string, s store.Store[T]) {
	path := fmt.Sprintf("/%v", name)
	pathId := path + "/:id"

	dep := Dependencies[T]{Store: s}

	r.GET(pathId, Read(dep))
	r.POST(path, Create(dep))
	r.PUT(path, Update(dep))
	r.DELETE(pathId, Delete(dep))
}

func Read[T store.Keyed](dep Dependencies[T]) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
		id := p.ByName("id")

		obj, err := dep.Store.Read(id)

		if err != nil {
			WriteError(w, err, http.StatusBadRequest)
			return
		}

		dat, err := json.Marshal(&obj)

		if err != nil {
			WriteError(w, err, http.StatusInternalServerError)
			return
		}

		w.Write(dat)
		w.WriteHeader(http.StatusOK)
	}
}

func Create[T store.Keyed](dep Dependencies[T]) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
		decoder := json.NewDecoder(r.Body)
		val := new(T)
		err := decoder.Decode(val)

		if err != nil {
			WriteError(w, err, http.StatusBadRequest)
			return
		}

		if err := dep.Store.Create(*val); err != nil {
			WriteError(w, err, http.StatusBadRequest)
			return
		}

		w.WriteHeader(http.StatusOK)
	}
}

func Update[T store.Keyed](dep Dependencies[T]) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
		decoder := json.NewDecoder(r.Body)
		val := new(T)
		err := decoder.Decode(val)

		if err != nil {
			WriteError(w, err, http.StatusBadRequest)
			return
		}

		if err := dep.Store.Update(*val); err != nil {
			WriteError(w, err, http.StatusBadRequest)
			return
		}

		w.WriteHeader(http.StatusOK)
	}
}

func Delete[T store.Keyed](dep Dependencies[T]) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
		id := p.ByName("id")

		err := dep.Store.Delete(id)

		if err != nil {
			WriteError(w, err, http.StatusBadRequest)
			return
		}

		w.WriteHeader(http.StatusOK)
	}
}

func WriteError(w http.ResponseWriter, err error, statusCode int) {
	w.WriteHeader(statusCode)
	w.Write([]byte(err.Error()))
	return
}
