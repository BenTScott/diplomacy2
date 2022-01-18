package store

import (
	"fmt"
	"sync"
)

type MemStore[T Keyed] struct {
	dat map[string]T
	rw  sync.RWMutex
}

func (m *MemStore[T]) Exists(key string) bool {
	m.rw.RLock()
	defer m.rw.RUnlock()

	_, exists := m.dat[key]
	return exists
}

func (m *MemStore[T]) Create(obj T) error {
	if m.Exists(obj.Key()) {
		return fmt.Errorf("item with key %v already exisits", obj.Key())
	}

	m.rw.Lock()
	defer m.rw.Unlock()

	m.dat[obj.Key()] = obj

	return nil
}

func (m *MemStore[T]) Update(obj T) error {
	if !m.Exists(obj.Key()) {
		return fmt.Errorf("item with key %v doesn't exisits", obj.Key())
	}

	m.rw.Lock()
	defer m.rw.Unlock()

	m.dat[obj.Key()] = obj
	return nil
}

func (m *MemStore[T]) Read(id string) (T, error) {
	m.rw.RLock()
	defer m.rw.RUnlock()

	obj, ok := m.dat[id]

	if !ok {
		return obj, fmt.Errorf("item %v does not exist", id)
	}

	return obj, nil
}

func (m *MemStore[T]) Delete(id string) error {
	if !m.Exists(id) {
		return fmt.Errorf("item %v does not exist", id)
	}

	m.rw.Lock()
	m.rw.Unlock()
	delete(m.dat, id)
	return nil
}

func NewMemStore[T Keyed]() Store[T] {
	return &MemStore[T]{
		dat: make(map[string]T),
		rw:  sync.RWMutex{},
	}
}
