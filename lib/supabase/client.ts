// Compatibility layer: Supabase client → Firebase
// This allows existing code to work with minimal changes

import { db, auth } from '../firebase/client'
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  QueryConstraint,
  Timestamp
} from 'firebase/firestore'
import { signOut } from 'firebase/auth'

class SupabaseQueryBuilder {
  private collectionName: string
  private constraints: QueryConstraint[] = []
  private selectFields: string = '*'
  private singleDoc = false
  private pendingInsert: any = null
  private pendingUpdate: any = null
  private pendingDelete: boolean = false
  private pendingUpsert: any = null

  constructor(tableName: string) {
    this.collectionName = tableName
  }

  select(fields: string = '*'): this {
    this.selectFields = fields
    return this
  }

  eq(field: string, value: any): this {
    this.constraints.push(where(field, '==', value))
    return this
  }

  neq(field: string, value: any): this {
    this.constraints.push(where(field, '!=', value))
    return this
  }

  gt(field: string, value: any): this {
    this.constraints.push(where(field, '>', value))
    return this
  }

  gte(field: string, value: any): this {
    this.constraints.push(where(field, '>=', value))
    return this
  }

  lt(field: string, value: any): this {
    this.constraints.push(where(field, '<', value))
    return this
  }

  lte(field: string, value: any): this {
    this.constraints.push(where(field, '<=', value))
    return this
  }

  is(field: string, value: null): this {
    this.constraints.push(where(field, '==', null))
    return this
  }

  in(field: string, values: any[]): this {
    this.constraints.push(where(field, 'in', values))
    return this
  }

  contains(field: string, value: any): this {
    this.constraints.push(where(field, 'array-contains', value))
    return this
  }

  order(field: string, options?: { ascending?: boolean }): this {
    const direction = options?.ascending === false ? 'desc' : 'asc'
    this.constraints.push(orderBy(field, direction))
    return this
  }

  limit(count: number): this {
    this.constraints.push(firestoreLimit(count))
    return this
  }

  single(): this {
    this.singleDoc = true
    return this
  }

  insert(data: any | any[]): SupabaseQueryBuilder {
    const builder = new SupabaseQueryBuilder(this.collectionName)
    builder['constraints'] = [...this.constraints]
    builder['selectFields'] = this.selectFields
    builder['pendingInsert'] = data
    return builder
  }

  upsert(data: any | any[]): SupabaseQueryBuilder {
    const builder = new SupabaseQueryBuilder(this.collectionName)
    builder['constraints'] = [...this.constraints]
    builder['selectFields'] = this.selectFields
    builder['pendingUpsert'] = data
    return builder
  }

  update(data: any): SupabaseQueryBuilder {
    const builder = new SupabaseQueryBuilder(this.collectionName)
    builder['constraints'] = [...this.constraints]
    builder['selectFields'] = this.selectFields
    builder['pendingUpdate'] = data
    return builder
  }

  delete(): SupabaseQueryBuilder {
    const builder = new SupabaseQueryBuilder(this.collectionName)
    builder['constraints'] = [...this.constraints]
    builder['pendingDelete'] = true
    return builder
  }

  private async execute() {
    try {
      // Handle pending upsert
      if (this.pendingUpsert !== null) {
        const dataArray = Array.isArray(this.pendingUpsert) ? this.pendingUpsert : [this.pendingUpsert]
        const results = []

        for (const item of dataArray) {
          const id = item.id || this.generateId()
          const docData = {
            ...item,
            id,
            created_at: item.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          await setDoc(doc(db, this.collectionName, id), docData, { merge: true })
          results.push(docData)
        }

        return { 
          data: Array.isArray(this.pendingUpsert) ? results : results[0], 
          error: null 
        }
      }

      // Handle pending delete
      if (this.pendingDelete) {
        const { data: docs, error } = await this.fetchData()
        if (error || !docs) throw error

        const docsArray = Array.isArray(docs) ? docs : [docs]
        for (const document of docsArray) {
          await deleteDoc(doc(db, this.collectionName, document.id))
        }
        return { error: null }
      }

      // Handle pending update
      if (this.pendingUpdate !== null) {
        const { data: docs, error } = await this.fetchData()
        if (error || !docs) throw error

        const docsArray = Array.isArray(docs) ? docs : [docs]
        const updateData = {
          ...this.pendingUpdate,
          updated_at: new Date().toISOString(),
        }

        for (const document of docsArray) {
          await updateDoc(doc(db, this.collectionName, document.id), updateData)
        }

        return { data: docsArray.map((d: any) => ({ ...d, ...updateData })), error: null }
      }

      // Handle pending insert
      if (this.pendingInsert !== null) {
        const dataArray = Array.isArray(this.pendingInsert) ? this.pendingInsert : [this.pendingInsert]
        const results = []

        for (const item of dataArray) {
          const id = this.generateId()
          const docData = {
            ...item,
            id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          await setDoc(doc(db, this.collectionName, id), docData)
          results.push(docData)
        }

        return { 
          data: Array.isArray(this.pendingInsert) ? results : results[0], 
          error: null 
        }
      }

      // Normal select query
      return await this.fetchData()
    } catch (error: any) {
      return { data: null, error }
    }
  }

  private async fetchData() {
    try {
      const collectionRef = collection(db, this.collectionName)

      if (this.constraints.length === 0) {
        const snapshot = await getDocs(collectionRef)
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        
        if (this.singleDoc) {
          return { data: data[0] || null, error: null }
        }
        return { data, error: null }
      }

      const q = query(collectionRef, ...this.constraints)
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      if (this.singleDoc) {
        return { data: data[0] || null, error: null }
      }

      return { data, error: null }
    } catch (error: any) {
      return { data: null, error }
    }
  }

  // Make thenable to support await
  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected)
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<any | TResult> {
    return this.execute().then(undefined, onrejected)
  }

  finally(onfinally?: (() => void) | null): Promise<any> {
    return this.execute().then(
      value => {
        if (onfinally) onfinally()
        return value
      },
      reason => {
        if (onfinally) onfinally()
        throw reason
      }
    )
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

export const supabase = {
  from: (table: string) => new SupabaseQueryBuilder(table),
  
  auth: {
    getUser: async () => {
      const user = auth.currentUser
      if (!user) {
        return { data: { user: null }, error: null }
      }
      
      return {
        data: {
          user: {
            id: user.uid,
            email: user.email,
            user_metadata: {
              full_name: user.displayName,
            }
          }
        },
        error: null
      }
    },
    
    signOut: async () => {
      try {
        await signOut(auth)
        // Clear session cookie
        await fetch('/api/auth/session', { method: 'DELETE' })
        return { error: null }
      } catch (error: any) {
        return { error }
      }
    }
  },

  storage: {
    from: (_bucket: string) => ({
      upload: async (path: string, file: File, options?: any) => {
        try {
          const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage')
          const { storage } = await import('../firebase/client')
          const storageRef = ref(storage, path)
          const snapshot = await uploadBytes(storageRef, file, options)
          const publicUrl = await getDownloadURL(snapshot.ref)
          return { data: { path: snapshot.ref.fullPath, publicUrl }, error: null }
        } catch (err: any) {
          return { data: null, error: err }
        }
      },
      getPublicUrl: async (path: string) => {
        try {
          const { ref, getDownloadURL } = await import('firebase/storage')
          const { storage } = await import('../firebase/client')
          const publicUrl = await getDownloadURL(ref(storage, path))
          return { data: { publicUrl } }
        } catch {
          return { data: { publicUrl: '' } }
        }
      },
      remove: async (paths: string[]) => {
        try {
          const { ref, deleteObject } = await import('firebase/storage')
          const { storage } = await import('../firebase/client')
          await Promise.all(paths.map(p => deleteObject(ref(storage, p)).catch(() => {})))
          return { data: null, error: null }
        } catch (err: any) {
          return { data: null, error: err }
        }
      }
    })
  }
}
